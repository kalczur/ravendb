﻿using System;
using System.Linq;

namespace Raven.Abstractions.Util
{
	public static class Etag
	{
		public static Guid Increment(Guid etag, int amount)
		{
			var byteArray = etag.ToByteArray();
			var changesCount = BitConverter.ToInt64(byteArray.Skip(8).Reverse().ToArray(), 0);

			return new Guid(
				byteArray.Take(8).Concat(
					BitConverter.GetBytes(changesCount + amount).Reverse()
					).ToArray()
				);
		}

		public static long GetChangesCount(Guid etag)
		{
			var byteArray = etag.ToByteArray();

			return BitConverter.ToInt64(byteArray.Skip(8).Reverse().ToArray(), 0);
		}
	}
}