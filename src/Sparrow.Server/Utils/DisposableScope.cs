﻿using System;
using System.Collections.Generic;

namespace Sparrow.Server.Utils
{
    public sealed class DisposableScope : IDisposable
    {
        private readonly LinkedList<IDisposable> _disposables = new();
        private int _delayedDispose;

        public void EnsureDispose(IDisposable toDispose)
        {
            _disposables.AddFirst(toDispose);
        }

        public void Dispose()
        {
            if (_delayedDispose-- > 0)
                return;

            List<Exception> errors = null; 
            foreach (var disposable in _disposables)
            {
                try
                {
                    disposable.Dispose();
                }
                catch (Exception e)
                {
                    errors ??= new List<Exception>();
                    errors.Add(e);
                }
            }

            if (errors != null)
                throw new AggregateException(errors);
        }

        public IDisposable Delay()
        {
            _delayedDispose++;

            return this;
        }
    }
}